const AWS = require('aws-sdk')
const { equals, omit, isEmpty } = require('ramda')

const ec2 = new AWS.EC2({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
})

const deploy = async (inputs, context) => {
  const { state } = context

  if (equals(omit(['subnetId'], state), inputs)) {
    return { subnetId: state.subnetId }
  }

  // vpcId, cidrBlock (ipv6CidrBlock?) and availabilityZone requires replacement
  if (!isEmpty(state) && !equals(omit(['subnetId'], state), inputs)) {
    await remove(inputs, context)
  }

  context.log('creating subnet...')
  const { Subnet } = await ec2
    .createSubnet({
      VpcId: inputs.vpcId,
      AvailabilityZone: inputs.availabilityZone,
      CidrBlock: inputs.cidrBlock,
      Ipv6CidrBlock: inputs.ipv6CidrBlock
    })
    .promise()

  context.saveState({
    subnetId: Subnet.SubnetId,
    vpcId: inputs.vpcId,
    availabilityZone: inputs.availabilityZone,
    cidrBlock: inputs.cidrBlock,
    ipv6CidrBlock: inputs.ipv6CidrBlock
  })

  context.log('subnet created')
  return { subnetId: Subnet.SubnetId }
}

const remove = async (inputs, context) => {
  context.log('removing subnet...')
  const { state } = context
  try {
    await ec2
      .deleteSubnet({
        SubnetId: state.subnetId
      })
      .promise()
  } catch (exception) {
    if (exception.message !== `The subnet ID '${state.subnetId}' does not exist`) {
      throw exception
    }
  }
  context.saveState({})
  context.log('subnet removed...')
  return {}
}

module.exports = {
  deploy,
  remove
}
